namespace AutoSOS.Api.DTOs;

public record RegisterOperatorDto(
    string Email,
    string Password,
    string Name,
    string Phone,
    string VehicleType,
    int? ServiceRadiusKm,
    List<Guid> EquipmentIds // Lista ID sprzętów które operator posiada
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

