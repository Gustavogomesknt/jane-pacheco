using JanePacheco.Api.Data;
using JanePacheco.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace JanePacheco.Api.Services;

public record FreeSlot(string Time, int ProfessionalId);

public class AvailabilityService(AppDbContext db)
{
    /// <summary>
    /// Horários livres de um dia para um serviço com a duração informada.
    /// Para cada horário devolve a primeira profissional livre (ou só a informada).
    /// </summary>
    public async Task<List<FreeSlot>> FreeSlotsAsync(DateOnly date, int durationMin, int? professionalId = null, CancellationToken ct = default)
    {
        var s = await db.Settings.AsNoTracking().FirstAsync(ct);
        if (s.ClosedDays.Contains((int)date.DayOfWeek)) return [];

        var now = TimeHelpers.NowAtClinic;
        var today = DateOnly.FromDateTime(now);
        if (date < today) return [];
        // Pelo site, só aceita horários com pelo menos 1h de antecedência.
        var minStart = date == today ? now.Hour * 60 + now.Minute + 60 : 0;

        var pros = await db.Professionals.AsNoTracking()
            .Where(p => p.Active && (professionalId == null || p.Id == professionalId))
            .OrderBy(p => p.Id).Select(p => p.Id).ToListAsync(ct);

        var busy = await db.Appointments.AsNoTracking()
            .Where(a => a.Date == date && a.Status != AppointmentStatus.Cancelado)
            .Select(a => new { a.ProfessionalId, a.StartMin, a.DurationMin })
            .ToListAsync(ct);

        var result = new List<FreeSlot>();
        for (var m = s.OpenMin; m + durationMin <= s.CloseMin; m += s.SlotMin)
        {
            if (m < minStart) continue;
            foreach (var p in pros)
            {
                var taken = busy.Any(b => b.ProfessionalId == p && b.StartMin < m + durationMin && b.StartMin + b.DurationMin > m);
                if (!taken) { result.Add(new FreeSlot(TimeHelpers.ToHm(m), p)); break; }
            }
        }
        return result;
    }

    /// <summary>Retorna o agendamento que conflita com o período, se houver.</summary>
    public Task<Appointment?> FindConflictAsync(DateOnly date, int startMin, int durationMin, int professionalId, Guid? ignoreId, CancellationToken ct = default) =>
        db.Appointments.AsNoTracking()
            .Where(a => a.Date == date && a.ProfessionalId == professionalId && a.Status != AppointmentStatus.Cancelado)
            .Where(a => ignoreId == null || a.Id != ignoreId)
            .Where(a => a.StartMin < startMin + durationMin && a.StartMin + a.DurationMin > startMin)
            .FirstOrDefaultAsync(ct);
}
