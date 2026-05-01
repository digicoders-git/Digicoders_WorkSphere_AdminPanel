import { createContext, useContext, useState } from "react";

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
    const [user, setUserState] = useState(() => {
        try {
            const stored = localStorage.getItem("user");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    // Always sync to localStorage when user changes
    const setUser = (newUser) => {
        setUserState(newUser);
        if (newUser) {
            localStorage.setItem("user", JSON.stringify(newUser));
        } else {
            localStorage.removeItem("user");
        }
    };

    const logout = () => {
        setUserState(null);
        localStorage.removeItem("user");
    };

    return (
        <StoreContext.Provider value={{ user, setUser, logout }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error("useStore must be used within StoreProvider");
    return context;
};
