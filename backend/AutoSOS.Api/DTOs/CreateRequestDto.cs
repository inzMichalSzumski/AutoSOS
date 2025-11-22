namespace AutoSOS.Api;

public record CreateRequestDto(
    string PhoneNumber,
    double FromLatitude,
    double FromLongitude,
    double? ToLatitude,
    double? ToLongitude,
    string? Description,
    Guid? RequiredEquipmentId // ID of equipment/service required for this request
);

