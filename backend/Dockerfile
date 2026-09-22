# Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY JanePacheco.Api/JanePacheco.Api.csproj JanePacheco.Api/
RUN dotnet restore JanePacheco.Api/JanePacheco.Api.csproj
COPY JanePacheco.Api/ JanePacheco.Api/
RUN dotnet publish JanePacheco.Api/JanePacheco.Api.csproj -c Release -o /app --no-restore

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_ENVIRONMENT=Production
# A porta vem da variável PORT (o Render define sozinho); 8080 é o padrão local.
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "JanePacheco.Api.dll"]
