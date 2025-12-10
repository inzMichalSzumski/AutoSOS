namespace AutoSOS.Api.Features.Operators;

public record UpdateLocationDto(double Latitude, double Longitude);
public record UpdateAvailabilityDto(bool IsAvailable);
public record UpdateOperatorEquipmentDto(List<Guid> EquipmentIds);

