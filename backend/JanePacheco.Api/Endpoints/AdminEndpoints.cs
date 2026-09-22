using JanePacheco.Api.Contracts;
using JanePacheco.Api.Data;
using JanePacheco.Api.Domain;
using JanePacheco.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JanePacheco.Api.Endpoints;

/// <summary>Rotas da área da equipe (exigem login).</summary>
public static class AdminEndpoints
{
    private static readonly string[] AllowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxImageBytes = 10 * 1024 * 1024;

    public static void MapAdminEndpoints(this WebApplication app)
    {
        var g = app.MapGroup("/api/admin").RequireAuthorization().WithTags("Equipe");

        // ---------- Agendamentos ----------
        g.MapGet("/appointments", async (DateOnly from, DateOnly to, AppDbContext db, CancellationToken ct) =>
            (await db.Appointments.AsNoTracking()
                .Where(a => a.Date >= from && a.Date <= to)
                .OrderBy(a => a.Date).ThenBy(a => a.StartMin)
                .ToListAsync(ct))
            .Select(AppointmentDto.From));

        g.MapPost("/appointments", async (AppointmentUpsert req, AppDbContext db, AvailabilityService av, CancellationToken ct) =>
        {
            var appt = new Appointment { Origin = "equipe" };
            var error = await ApplyAsync(appt, req, db, av, ct);
            if (error is not null) return error;
            db.Appointments.Add(appt);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/admin/appointments/{appt.Id}", AppointmentDto.From(appt));
        });

        g.MapPut("/appointments/{id:guid}", async (Guid id, AppointmentUpsert req, AppDbContext db, AvailabilityService av, CancellationToken ct) =>
        {
            var appt = await db.Appointments.FirstOrDefaultAsync(a => a.Id == id, ct);
            if (appt is null) return Results.NotFound();
            var error = await ApplyAsync(appt, req, db, av, ct);
            if (error is not null) return error;
            appt.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return Results.Ok(AppointmentDto.From(appt));
        });

        g.MapPatch("/appointments/{id:guid}/status", async (Guid id, StatusUpdate req, AppDbContext db, AvailabilityService av, CancellationToken ct) =>
        {
            var appt = await db.Appointments.FirstOrDefaultAsync(a => a.Id == id, ct);
            if (appt is null) return Results.NotFound();
            // Reativar um cancelado exige que o horário ainda esteja livre.
            if (appt.Status == AppointmentStatus.Cancelado && req.Status != AppointmentStatus.Cancelado)
            {
                var c = await av.FindConflictAsync(appt.Date, appt.StartMin, appt.DurationMin, appt.ProfessionalId, appt.Id, ct);
                if (c is not null) return Results.Conflict(new ApiError($"O horário já foi ocupado por {c.ClientName}."));
            }
            appt.Status = req.Status;
            appt.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return Results.Ok(AppointmentDto.From(appt));
        });

        g.MapDelete("/appointments/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var n = await db.Appointments.Where(a => a.Id == id).ExecuteDeleteAsync(ct);
            return n == 0 ? Results.NotFound() : Results.NoContent();
        });

        // ---------- Profissionais ----------
        g.MapGet("/professionals", async (AppDbContext db, CancellationToken ct) =>
            (await db.Professionals.AsNoTracking().OrderBy(p => p.Id).ToListAsync(ct)).Select(ProfessionalDto.From));

        g.MapPost("/professionals", async (ProfessionalUpsert req, AppDbContext db, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name)) return Results.BadRequest(new ApiError("Informe o nome."));
            var p = new Professional { Name = req.Name.Trim(), Active = req.Active };
            db.Professionals.Add(p);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/admin/professionals/{p.Id}", ProfessionalDto.From(p));
        });

        g.MapPut("/professionals/{id:int}", async (int id, ProfessionalUpsert req, AppDbContext db, CancellationToken ct) =>
        {
            var p = await db.Professionals.FindAsync([id], ct);
            if (p is null) return Results.NotFound();
            p.Name = req.Name.Trim(); p.Active = req.Active;
            await db.SaveChangesAsync(ct);
            return Results.Ok(ProfessionalDto.From(p));
        });

        // ---------- Tratamentos ----------
        g.MapGet("/services", async (AppDbContext db, CancellationToken ct) =>
            (await db.Services.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(ct)).Select(ServiceDto.From));

        g.MapPost("/services", async (ServiceUpsert req, AppDbContext db, CancellationToken ct) =>
        {
            var s = new ServiceItem();
            if (Apply(s, req) is { } err) return err;
            db.Services.Add(s);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/admin/services/{s.Id}", ServiceDto.From(s));
        });

        g.MapPut("/services/{id:int}", async (int id, ServiceUpsert req, AppDbContext db, CancellationToken ct) =>
        {
            var s = await db.Services.FindAsync([id], ct);
            if (s is null) return Results.NotFound();
            if (Apply(s, req) is { } err) return err;
            await db.SaveChangesAsync(ct);
            return Results.Ok(ServiceDto.From(s));
        });

        // Não apaga de verdade: o histórico de agendamentos aponta para o serviço.
        g.MapDelete("/services/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
        {
            var n = await db.Services.Where(s => s.Id == id).ExecuteUpdateAsync(u => u.SetProperty(s => s.Active, false), ct);
            return n == 0 ? Results.NotFound() : Results.NoContent();
        });

        // ---------- Configurações da clínica ----------
        g.MapGet("/settings", (AppDbContext db, CancellationToken ct) => ClinicMapper.LoadAsync(db, ct));

        g.MapPut("/settings", async (SettingsUpdate req, AppDbContext db, CancellationToken ct) =>
        {
            if (!TimeHelpers.TryParseHm(req.Open, out var open) || !TimeHelpers.TryParseHm(req.Close, out var close) || close <= open)
                return Results.BadRequest(new ApiError("O horário de fechamento precisa ser depois da abertura."));
            if (req.SlotMin is not (15 or 30 or 60))
                return Results.BadRequest(new ApiError("Intervalo da agenda deve ser 15, 30 ou 60 minutos."));

            var s = await db.Settings.FirstAsync(ct);
            s.Name = req.Name.Trim(); s.Tagline = req.Tagline.Trim(); s.About = req.About.Trim();
            s.Address = req.Address.Trim(); s.WhatsApp = req.WhatsApp.Trim(); s.Instagram = req.Instagram.Trim().TrimStart('@');
            s.OpenMin = open; s.CloseMin = close; s.SlotMin = req.SlotMin;
            s.ClosedDays = req.ClosedDays.Where(d => d is >= 0 and <= 6).Distinct().ToList();
            await db.SaveChangesAsync(ct);
            return Results.Ok(await ClinicMapper.LoadAsync(db, ct));
        });

        // ---------- Fotos ----------
        g.MapPost("/photos", async ([FromForm] string slot, [FromForm] string? caption, IFormFile file,
            AppDbContext db, UploadStorage storage, CancellationToken ct) =>
        {
            if (slot is not ("hero" or "about" or "gallery")) return Results.BadRequest(new ApiError("Local da foto inválido."));
            if (!AllowedImageTypes.Contains(file.ContentType)) return Results.BadRequest(new ApiError("Use uma foto em JPG, PNG ou WebP."));
            if (file.Length > MaxImageBytes) return Results.BadRequest(new ApiError("A foto precisa ter até 10 MB."));

            var ext = file.ContentType switch { "image/png" => ".png", "image/webp" => ".webp", _ => ".jpg" };
            var fileName = $"{Guid.NewGuid():N}{ext}";
            await using (var fs = File.Create(Path.Combine(storage.Root, fileName)))
                await file.CopyToAsync(fs, ct);

            // Capa e foto do "Sobre" são únicas: substitui a anterior.
            if (slot is "hero" or "about")
            {
                var old = await db.Photos.Where(p => p.Slot == slot).ToListAsync(ct);
                foreach (var o in old) DeleteFile(storage, o.FileName);
                db.Photos.RemoveRange(old);
            }

            var order = await db.Photos.Where(p => p.Slot == slot).Select(p => (int?)p.SortOrder).MaxAsync(ct) ?? -1;
            var photo = new Photo { Slot = slot, FileName = fileName, Caption = caption?.Trim() ?? "", SortOrder = order + 1 };
            db.Photos.Add(photo);
            await db.SaveChangesAsync(ct);
            return Results.Created(PhotoDto.From(photo).Url, PhotoDto.From(photo));
        }).DisableAntiforgery(); // API protegida por JWT, sem cookies.

        g.MapPut("/photos/{id:int}", async (int id, PhotoUpdate req, AppDbContext db, CancellationToken ct) =>
        {
            var p = await db.Photos.FindAsync([id], ct);
            if (p is null) return Results.NotFound();
            p.Caption = req.Caption.Trim(); p.SortOrder = req.SortOrder;
            await db.SaveChangesAsync(ct);
            return Results.Ok(PhotoDto.From(p));
        });

        g.MapDelete("/photos/{id:int}", async (int id, AppDbContext db, UploadStorage storage, CancellationToken ct) =>
        {
            var p = await db.Photos.FindAsync([id], ct);
            if (p is null) return Results.NotFound();
            DeleteFile(storage, p.FileName);
            db.Photos.Remove(p);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    private static async Task<IResult?> ApplyAsync(Appointment appt, AppointmentUpsert req, AppDbContext db, AvailabilityService av, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.ClientName)) return Results.BadRequest(new ApiError("Informe o nome da cliente."));
        if (!TimeHelpers.TryParseHm(req.Time, out var start)) return Results.BadRequest(new ApiError("Horário inválido."));
        if (req.DurationMin is < 5 or > 600) return Results.BadRequest(new ApiError("Duração inválida."));

        var svc = await db.Services.AsNoTracking().FirstOrDefaultAsync(s => s.Id == req.ServiceId, ct);
        if (svc is null) return Results.BadRequest(new ApiError("Tratamento não encontrado."));
        var pro = await db.Professionals.AsNoTracking().FirstOrDefaultAsync(p => p.Id == req.ProfessionalId, ct);
        if (pro is null) return Results.BadRequest(new ApiError("Profissional não encontrada."));

        var status = req.Status ?? appt.Status;
        if (status != AppointmentStatus.Cancelado)
        {
            var c = await av.FindConflictAsync(req.Date, start, req.DurationMin, req.ProfessionalId, appt.Id, ct);
            if (c is not null)
                return Results.Conflict(new ApiError(
                    $"{pro.Name} já tem {c.ClientName} ({c.ServiceName}) às {TimeHelpers.ToHm(c.StartMin)} nesse período."));
        }

        appt.Date = req.Date; appt.StartMin = start; appt.DurationMin = req.DurationMin;
        appt.ServiceId = svc.Id; appt.ServiceName = svc.Name; appt.Category = svc.Category; appt.Price = req.Price;
        appt.ProfessionalId = pro.Id;
        appt.ClientName = req.ClientName.Trim(); appt.ClientPhone = (req.ClientPhone ?? "").Trim();
        appt.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        appt.Status = status;
        return null;
    }

    private static IResult? Apply(ServiceItem s, ServiceUpsert req)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return Results.BadRequest(new ApiError("Informe o nome do tratamento."));
        if (req.DurationMin is < 5 or > 600) return Results.BadRequest(new ApiError("Duração inválida."));
        if (req.Price < 0) return Results.BadRequest(new ApiError("Preço inválido."));
        s.Name = req.Name.Trim(); s.Description = (req.Description ?? "").Trim(); s.Category = req.Category;
        s.DurationMin = req.DurationMin; s.Price = req.Price; s.SortOrder = req.SortOrder; s.Active = req.Active;
        return null;
    }

    private static void DeleteFile(UploadStorage storage, string fileName)
    {
        var path = Path.Combine(storage.Root, Path.GetFileName(fileName));
        if (File.Exists(path)) File.Delete(path);
    }
}
