namespace AutoSOS.Api.Features.Offers;

public record CreateOfferDto(
    Guid RequestId,
    Guid OperatorId,
    decimal Price,
    int? EstimatedTimeMinutes
);

