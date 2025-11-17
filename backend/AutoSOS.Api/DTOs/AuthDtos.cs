namespace AutoSOS.Api.DTOs;

public record RegisterOperatorDto(
    string Email,
    string Password,
    string Name,
    string Phone,
    string VehicleType,
    int? ServiceRadiusKm
);

public record LoginDto(
    string Email,
    string Password
);

public record AuthResponseDto(
    string Token,
    Guid OperatorId,
    string Name,
    string Email
);

