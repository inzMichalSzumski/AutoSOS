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
}

