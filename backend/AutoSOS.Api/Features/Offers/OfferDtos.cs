namespace AutoSOS.Api.Features.Offers;

public record CreateOfferDto(
    Guid RequestId,
    Guid OperatorId,
    decimal Price,
    int? EstimatedTimeMinutes
);

public record AcceptOfferDto(
    string PhoneNumber // Phone number of the user accepting the offer
);

