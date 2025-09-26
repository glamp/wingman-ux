import React from 'react';
import {
  Box,
  ButtonBase,
  Typography
} from '@mui/material';
import { useActiveTab, usePopupStore } from '@/stores/popup-store';
import { TabId } from '@/types/stores';
import { colors, glassStyles, radius, shadows } from '@/theme/theme';

interface TabData {
  id: TabId;
  label: string;
  emoji: string;
}

const tabs: TabData[] = [
  {
    id: 'main',
    label: 'Capture',
    emoji: '🎯'
  },
  {
    id: 'live-share',
    label: 'Share',
    emoji: '🚀'
  },
  {
    id: 'settings',
    label: 'Settings',
    emoji: '⚙️'
  }
];

export const TabNavigation: React.FC = () => {
  const activeTab = useActiveTab();
  const setActiveTab = usePopupStore(state => state.setActiveTab);

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        gap: 2,
        mx: 2,
        mb: 1.5,
        p: 1,
        ...glassStyles,
        borderRadius: radius.xl,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <ButtonBase
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              p: 1.2,
              px: 2,
              borderRadius: radius.md,
              minWidth: 80,
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              background: isActive
                ? 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #0084ff, #8b5cf6) border-box'
                : 'transparent',
              border: isActive ? '2px solid transparent' : '2px solid transparent',
              color: isActive ? colors.primary : colors.textSecondary,
              boxShadow: isActive ? shadows.md : 'none',
              '&::before': isActive ? {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 132, 255, 0.08)',
                borderRadius: radius.md,
              } : {},
              '&:hover': {
                transform: 'scale(1.05) translateY(-2px)',
                background: isActive
                  ? 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #0084ff, #8b5cf6) border-box'
                  : 'rgba(0, 132, 255, 0.05)',
                boxShadow: isActive ? shadows.glow : shadows.sm,
              },
              '&:active': {
                transform: 'scale(0.98)',
              },
            }}
          >
            <Typography
              sx={{
                fontSize: '24px',
                lineHeight: 1,
                display: 'block',
                filter: isActive ? 'none' : 'grayscale(0.3)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {tab.emoji}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: isActive ? 600 : 500,
                fontSize: '11px',
                letterSpacing: '0.02em',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {tab.label}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
};