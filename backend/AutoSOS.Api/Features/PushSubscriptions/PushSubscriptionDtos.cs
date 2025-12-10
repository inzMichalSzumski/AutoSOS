namespace AutoSOS.Api.Features.PushSubscriptions;

public record SavePushSubscriptionDto(
    string OperatorId,
    string Endpoint,
    PushSubscriptionKeysDto Keys
);

public record PushSubscriptionKeysDto(
    string P256dh,
    string Auth
);

public record RemovePushSubscriptionDto(
    string OperatorId,
    string Endpoint
);

