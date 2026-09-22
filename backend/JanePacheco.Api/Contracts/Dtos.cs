using JanePacheco.Api.Domain;
using JanePacheco.Api.Services;

namespace JanePacheco.Api.Contracts;

// ---------- Leitura ----------

public record PhotoDto(int Id, string Slot, string Url, string Caption, int SortOrder)
{
    public static PhotoDto From(Photo p) => new(p.Id, p.Slot, $"/uploads/{p.FileName}", p.Caption, p.SortOrder);
}

public record ClinicDto(
    string Name, string Tagline, string About, string Address, string WhatsApp, string Instagram,
    string Open, string Close, int SlotMin, List<int> ClosedDays,
    PhotoDto? HeroPhoto, PhotoDto? AboutPhoto, List<PhotoDto> Gallery);

public record ServiceDto(int Id, string Name, string Description, Category Category, int DurationMin, decimal Price, int SortOrder, bool Active)
{
    public static ServiceDto From(ServiceItem s) => new(s.Id, s.Name, s.Description, s.Category, s.DurationMin, s.Price, s.SortOrder, s.Active);
}

public record ProfessionalDto(int Id, string Name, bool Active)
{
    public static ProfessionalDto From(Professional p) => new(p.Id, p.Name, p.Active);
}

public record DayAvailabilityDto(DateOnly Date, bool HasSlots);

public record AppointmentDto(
    Guid Id, DateOnly Date, string Time, string End, int DurationMin,
    int ServiceId, string ServiceName, Category Category, decimal Price,
    int ProfessionalId, string ClientName, string ClientPhone, string? Notes,
    AppointmentStatus Status, string Origin, DateTime CreatedAt)
{
    public static AppointmentDto From(Appointment a) => new(
        a.Id, a.Date, TimeHelpers.ToHm(a.StartMin), TimeHelpers.ToHm(a.StartMin + a.DurationMin), a.DurationMin,
        a.ServiceId, a.ServiceName, a.Category, a.Price,
        a.ProfessionalId, a.ClientName, a.ClientPhone, a.Notes,
        a.Status, a.Origin, a.CreatedAt);
}

// ---------- Escrita ----------

public record BookingRequest(int ServiceId, DateOnly Date, string Time, int? ProfessionalId, string Name, string Phone);
public record BookingResponse(Guid Id, DateOnly Date, string Time, string ServiceName, string ProfessionalName);

public record AppointmentUpsert(
    DateOnly Date, string Time, int DurationMin, int ServiceId, int ProfessionalId,
    string ClientName, string ClientPhone, decimal Price, string? Notes, AppointmentStatus? Status);

public record StatusUpdate(AppointmentStatus Status);

public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, DateTime ExpiresAt);

public record SettingsUpdate(
    string Name, string Tagline, string About, string Address, string WhatsApp, string Instagram,
    string Open, string Close, int SlotMin, List<int> ClosedDays);

public record ServiceUpsert(string Name, string Description, Category Category, int DurationMin, decimal Price, int SortOrder, bool Active = true);
public record ProfessionalUpsert(string Name, bool Active = true);
public record PhotoUpdate(string Caption, int SortOrder);

public record ApiError(string Message);
