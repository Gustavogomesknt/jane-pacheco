namespace JanePacheco.Api.Services;

public static class TimeHelpers
{
    private static readonly TimeZoneInfo ClinicTz = FindTz();

    private static TimeZoneInfo FindTz()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo"); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.Local; }
    }

    /// <summary>Data e hora atuais no fuso da clínica.</summary>
    public static DateTime NowAtClinic => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ClinicTz);

    public static string ToHm(int minutes) => $"{minutes / 60:00}:{minutes % 60:00}";

    public static bool TryParseHm(string? value, out int minutes)
    {
        minutes = 0;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var parts = value.Split(':');
        if (parts.Length != 2 || !int.TryParse(parts[0], out var h) || !int.TryParse(parts[1], out var m)) return false;
        if (h is < 0 or > 23 || m is < 0 or > 59) return false;
        minutes = h * 60 + m;
        return true;
    }

    public static string Digits(string? s) => new((s ?? "").Where(char.IsDigit).ToArray());
}
