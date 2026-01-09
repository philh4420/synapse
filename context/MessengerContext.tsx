
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MessengerContextType {
  isOpen: boolean;
  activeUserId: string | null;
  openChat: (uid: string) => void;
  closeChat: () => void;
  toggleMessenger: () => void;
}

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

export const useMessenger = () => {
  const context = useContext(MessengerContext);
  if (!context) {
    throw new Error('useMessenger must be used within a MessengerProvider');
  }
  return context;
};

export const MessengerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  const openChat = (uid: string) => {
    setActiveUserId(uid);
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    setActiveUserId(null);
  };

  const toggleMessenger = () => {
    if (isOpen) {
      closeChat();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <MessengerContext.Provider value={{ isOpen, activeUserId, openChat, closeChat, toggleMessenger }}>
      {children}
    </MessengerContext.Provider>
  );
};
