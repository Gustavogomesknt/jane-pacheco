using System.Data;
using JanePacheco.Api.Contracts;
using JanePacheco.Api.Data;
using JanePacheco.Api.Domain;
using JanePacheco.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace JanePacheco.Api.Endpoints;

/// <summary>Rotas abertas, usadas pelo site das clientes.</summary>
public static class PublicEndpoints
{
    public static void MapPublicEndpoints(this WebApplication app)
    {
        var g = app.MapGroup("/api/public").WithTags("Site");

        g.MapGet("/clinic", (AppDbContext db, CancellationToken ct) => ClinicMapper.LoadAsync(db, ct));

        g.MapGet("/services", async (AppDbContext db, CancellationToken ct) =>
            (await db.Services.AsNoTracking().Where(s => s.Active).OrderBy(s => s.SortOrder).ThenBy(s => s.Name).ToListAsync(ct))
                .Select(ServiceDto.From));

        // Próximos dias em que a clínica abre, indicando se ainda há horário para o serviço.
        g.MapGet("/days", async (int serviceId, AppDbContext db, AvailabilityService av, CancellationToken ct) =>
        {
            var svc = await db.Services.AsNoTracking().FirstOrDefaultAsync(s => s.Id == serviceId && s.Active, ct);
            if (svc is null) return Results.NotFound(new ApiError("Tratamento não encontrado."));
            var settings = await db.Settings.AsNoTracking().FirstAsync(ct);

            var today = DateOnly.FromDateTime(TimeHelpers.NowAtClinic);
            var days = new List<DayAvailabilityDto>();
            for (var d = today; days.Count < 21 && d < today.AddDays(45); d = d.AddDays(1))
            {
                if (settings.ClosedDays.Contains((int)d.DayOfWeek)) continue;
                var slots = await av.FreeSlotsAsync(d, svc.DurationMin, null, ct);
                days.Add(new DayAvailabilityDto(d, slots.Count > 0));
            }
            return Results.Ok(days);
        });

        g.MapGet("/availability", async (int serviceId, DateOnly date, AppDbContext db, AvailabilityService av, CancellationToken ct) =>
        {
            var svc = await db.Services.AsNoTracking().FirstOrDefaultAsync(s => s.Id == serviceId && s.Active, ct);
            if (svc is null) return Results.NotFound(new ApiError("Tratamento não encontrado."));
            return Results.Ok(await av.FreeSlotsAsync(date, svc.DurationMin, null, ct));
        });

        g.MapPost("/bookings", async (BookingRequest req, AppDbContext db, AvailabilityService av, CancellationToken ct) =>
        {
            var name = (req.Name ?? "").Trim();
            var phone = (req.Phone ?? "").Trim();
            if (name.Length < 3) return Results.BadRequest(new ApiError("Informe seu nome."));
            if (TimeHelpers.Digits(phone).Length < 10) return Results.BadRequest(new ApiError("Informe um WhatsApp com DDD."));
            if (!TimeHelpers.TryParseHm(req.Time, out var start)) return Results.BadRequest(new ApiError("Horário inválido."));

            var svc = await db.Services.AsNoTracking().FirstOrDefaultAsync(s => s.Id == req.ServiceId && s.Active, ct);
            if (svc is null) return Results.BadRequest(new ApiError("Tratamento não encontrado."));

            try
            {
                // Transação serializável: evita que duas clientes peguem o mesmo horário ao mesmo tempo.
                await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

                var slot = (await av.FreeSlotsAsync(req.Date, svc.DurationMin, req.ProfessionalId, ct))
                    .FirstOrDefault(s => s.Time == TimeHelpers.ToHm(start));
                if (slot is null)
                    return Results.Conflict(new ApiError("Esse horário acabou de ser reservado. Escolha outro."));

                var appt = new Appointment
                {
                    Date = req.Date, StartMin = start, DurationMin = svc.DurationMin,
                    ServiceId = svc.Id, ServiceName = svc.Name, Category = svc.Category, Price = svc.Price,
                    ProfessionalId = slot.ProfessionalId,
                    ClientName = name, ClientPhone = phone,
                    Origin = "site"
                };
                db.Appointments.Add(appt);
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                var proName = await db.Professionals.Where(p => p.Id == slot.ProfessionalId).Select(p => p.Name).FirstAsync(ct);
                return Results.Created($"/api/public/bookings/{appt.Id}",
                    new BookingResponse(appt.Id, appt.Date, TimeHelpers.ToHm(appt.StartMin), appt.ServiceName, proName));
            }
            catch (Exception ex) when (IsConcurrencyConflict(ex))
            {
                return Results.Conflict(new ApiError("Esse horário acabou de ser reservado. Escolha outro."));
            }
        });

        // Fotos do site, servidas a partir do banco. O nome é único, então o navegador pode guardar em cache para sempre.
        app.MapGet("/uploads/{name}", async (string name, AppDbContext db, HttpContext http, CancellationToken ct) =>
        {
            var c = await db.PhotoContents.AsNoTracking()
                .Where(x => x.Photo!.FileName == name)
                .Select(x => new { x.ContentType, x.Data })
                .FirstOrDefaultAsync(ct);
            if (c is null) return Results.NotFound();
            http.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            return Results.File(c.Data, c.ContentType);
        }).ExcludeFromDescription();
    }

    /// <summary>Duas reservas simultâneas no mesmo horário: Postgres (40001) ou SQLite ocupado (5).</summary>
    private static bool IsConcurrencyConflict(Exception ex)
    {
        for (var e = ex; e is not null; e = e.InnerException)
            if (e is Npgsql.PostgresException { SqlState: "40001" } || e is Microsoft.Data.Sqlite.SqliteException { SqliteErrorCode: 5 })
                return true;
        return false;
    }
}
