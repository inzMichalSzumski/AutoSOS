using Microsoft.AspNetCore.SignalR;

namespace AutoSOS.Api.Hubs;

public class RequestHub : Hub
{
    public async Task JoinRequestGroup(string requestId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"request-{requestId}");
    }

    public async Task LeaveRequestGroup(string requestId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"request-{requestId}");
    }

    public async Task JoinOperatorGroup(string operatorId)
    {
        // Operatorzy dołączają do swojej grupy, żeby otrzymywać powiadomienia
        await Groups.AddToGroupAsync(Context.ConnectionId, $"operator-{operatorId}");
    }

    public async Task LeaveOperatorGroup(string operatorId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"operator-{operatorId}");
    }
}

