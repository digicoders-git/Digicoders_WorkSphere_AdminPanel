import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUnreadCount } from "../modules/notifications/services/notificationService";
import { useStore } from "./StoreContext";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useStore();
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(async () => {
        if (!user) return;
        try {
            const data = await getUnreadCount();
            setUnreadCount(data.count || 0);
        } catch { /* silent */ }
    }, [user]);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 30000); // poll every 30s
        return () => clearInterval(id);
    }, [refresh]);

    return (
        <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refresh }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
