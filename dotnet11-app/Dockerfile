FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:11.0-preview AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/aspnet:11.0-preview
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "DotnetApp.dll"]
