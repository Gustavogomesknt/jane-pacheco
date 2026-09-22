using Npgsql;

namespace JanePacheco.Api.Data;

/// <summary>Escolhe o banco pela connection string: Postgres (Neon) em produção, SQLite em dev.</summary>
public static class DbConfig
{
    public static bool IsPostgres(string cs) =>
        cs.StartsWith("postgres", StringComparison.OrdinalIgnoreCase) ||
        cs.Contains("Host=", StringComparison.OrdinalIgnoreCase);

    /// <summary>Aceita a URL que o Neon mostra (postgresql://user:senha@host/db?sslmode=require).</summary>
    public static string ToNpgsql(string cs)
    {
        if (!cs.StartsWith("postgres", StringComparison.OrdinalIgnoreCase)) return cs;

        var uri = new Uri(cs);
        var user = uri.UserInfo.Split(':', 2);
        var b = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.Trim('/'),
            Username = Uri.UnescapeDataString(user[0]),
            Password = user.Length > 1 ? Uri.UnescapeDataString(user[1]) : null,
            SslMode = SslMode.Require
        };
        return b.ConnectionString;
    }
}
