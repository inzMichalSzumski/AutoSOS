namespace AutoSOS.Api;

public record CreateOfferDto(
    Guid RequestId,
    Guid OperatorId,
    decimal Price,
    int? EstimatedTimeMinutes
);

