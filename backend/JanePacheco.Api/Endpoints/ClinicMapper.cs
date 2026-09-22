using JanePacheco.Api.Contracts;
using JanePacheco.Api.Data;
using JanePacheco.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace JanePacheco.Api.Endpoints;

public static class ClinicMapper
{
    public static async Task<ClinicDto> LoadAsync(AppDbContext db, CancellationToken ct)
    {
        var s = await db.Settings.AsNoTracking().FirstAsync(ct);
        var photos = await db.Photos.AsNoTracking().OrderBy(p => p.SortOrder).ThenBy(p => p.Id).ToListAsync(ct);
        return new ClinicDto(
            s.Name, s.Tagline, s.About, s.Address, s.WhatsApp, s.Instagram,
            TimeHelpers.ToHm(s.OpenMin), TimeHelpers.ToHm(s.CloseMin), s.SlotMin, s.ClosedDays,
            photos.Where(p => p.Slot == "hero").Select(PhotoDto.From).FirstOrDefault(),
            photos.Where(p => p.Slot == "about").Select(PhotoDto.From).FirstOrDefault(),
            photos.Where(p => p.Slot == "gallery").Select(PhotoDto.From).ToList());
    }
}
