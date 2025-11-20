namespace AutoSOS.Api;

public record CreateRequestDto(
    string PhoneNumber,
    double FromLatitude,
    double FromLongitude,
    double? ToLatitude,
    double? ToLongitude,
    string? Description,
    Guid? RequiredEquipmentId // ID sprzętu/usługi wymaganej dla tego zgłoszenia
);

