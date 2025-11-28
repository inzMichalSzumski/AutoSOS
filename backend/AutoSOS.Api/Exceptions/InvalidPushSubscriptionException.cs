namespace AutoSOS.Api.Exceptions;

/// <summary>
/// Exception thrown when a push subscription is invalid (e.g., 410 Gone or 404 Not Found)
/// This indicates the subscription should be marked as inactive
/// </summary>
public class InvalidPushSubscriptionException : Exception
{
    public System.Net.HttpStatusCode StatusCode { get; }

    public InvalidPushSubscriptionException(System.Net.HttpStatusCode statusCode, string message, Exception? innerException = null)
        : base(message, innerException)
    {
        StatusCode = statusCode;
    }
}

