import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';

/**
 * useRealtimeUpdates – subscribes to socket.io events for chores & shopping.
 * On each event it invalidates the corresponding TanStack Query cache and
 * shows a brief toast notification.
 */
export const useRealtimeUpdates = (groupId?: string) => {
  const { io } = useAppContext();
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!io || !groupId) return;

    const handlers = {
      new_chore: () => {
        queryClient.invalidateQueries({ queryKey: ['chores', groupId] });
        toast.show('New chore added 🎉');
      },
      chore_updated: () => {
        queryClient.invalidateQueries({ queryKey: ['chores', groupId] });
        toast.show('A chore was updated');
      },
      new_shopping_item: () => {
        queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
        toast.show('New shopping item 📦');
      },
      shopping_item_updated: () => {
        queryClient.invalidateQueries({ queryKey: ['shopping', groupId] });
        toast.show('Shopping item updated');
      },
    };

    // Attach listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      io.on(event, handler as any);
    });

    // Cleanup on unmount / group change
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        io.off(event, handler as any);
      });
    };
  }, [io, groupId, queryClient, toast]);
};
