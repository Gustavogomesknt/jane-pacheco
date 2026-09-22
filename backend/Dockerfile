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
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    ConnectionStrings__Default="Data Source=/data/janepacheco.db" \
    Uploads__Path=/data/uploads
RUN mkdir -p /data/uploads
EXPOSE 8080
ENTRYPOINT ["dotnet", "JanePacheco.Api.dll"]
