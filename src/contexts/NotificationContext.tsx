import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { FlashbarProps } from '@cloudscape-design/components/flashbar';

interface NotificationContextType {
  notifications: FlashbarProps.MessageDefinition[];
  addNotification: (type: FlashbarProps.Type, content: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<FlashbarProps.MessageDefinition[]>([]);

  const addNotification = useCallback((type: FlashbarProps.Type, content: string) => {
    const id = String(Date.now());
    setNotifications(prev => [
      ...prev,
      {
        type,
        content,
        id,
        dismissible: true,
        onDismiss: () => setNotifications(n => n.filter(item => item.id !== id)),
      },
    ]);
    setTimeout(() => {
      setNotifications(n => n.filter(item => item.id !== id));
    }, 5000);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
