using System.Security.Cryptography;
using System.Text;
using JanePacheco.Api.Contracts;
using JanePacheco.Api.Services;

namespace JanePacheco.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        // MVP: um único login de administradora, definido em configuração (user-secrets / variáveis de ambiente).
        // Próximo passo natural: tabela de usuários com ASP.NET Identity.
        app.MapPost("/api/auth/login", (LoginRequest req, IConfiguration cfg, TokenService tokens) =>
        {
            var email = cfg["Admin:Email"] ?? "";
            var password = cfg["Admin:Password"] ?? "";
            var ok = SafeEquals(req.Email?.Trim().ToLowerInvariant(), email.ToLowerInvariant())
                     & SafeEquals(req.Password, password);
            if (!ok || password.Length == 0)
                return Results.Json(new ApiError("E-mail ou senha incorretos."), statusCode: StatusCodes.Status401Unauthorized);

            var (token, expires) = tokens.Create(email);
            return Results.Ok(new LoginResponse(token, expires));
        }).WithTags("Auth");
    }

    private static bool SafeEquals(string? a, string b)
    {
        var x = Encoding.UTF8.GetBytes(a ?? "");
        var y = Encoding.UTF8.GetBytes(b);
        return x.Length == y.Length && CryptographicOperations.FixedTimeEquals(x, y);
    }
}
