namespace AutoSOS.Api.Features.Requests;

public record CreateRequestDto(
    string PhoneNumber,
    double FromLatitude,
    double FromLongitude,
    double? ToLatitude,
    double? ToLongitude,
    string? Description,
    Guid? RequiredEquipmentId // ID of equipment/service required for this request
);

public record CancelRequestDto(
    string PhoneNumber
);

