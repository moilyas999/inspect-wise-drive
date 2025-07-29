import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react';

export const OfflineIndicator = () => {
  const { isOnline, syncInProgress, pendingActions, syncOfflineActions } = useOfflineSync();

  if (isOnline && pendingActions === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="gap-2">
          <WifiOff className="w-4 h-4" />
          Offline
        </Badge>
      )}
      
      {pendingActions > 0 && (
        <Badge variant="secondary" className="gap-2">
          <Clock className="w-4 h-4" />
          {pendingActions} pending
        </Badge>
      )}
      
      {isOnline && pendingActions > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={syncOfflineActions}
          disabled={syncInProgress}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncInProgress ? 'animate-spin' : ''}`} />
          {syncInProgress ? 'Syncing...' : 'Sync'}
        </Button>
      )}
      
      {isOnline && pendingActions === 0 && (
        <Badge variant="default" className="gap-2">
          <Wifi className="w-4 h-4" />
          Online
        </Badge>
      )}
    </div>
  );
};