import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  RocketLaunch as RocketLaunchIcon,
  Share as ShareIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useActiveTab, usePopupStore } from '@/stores/popup-store';
import { TabId } from '@/types/stores';

interface TabData {
  id: TabId;
  label: string;
  icon: React.ReactElement;
}

const tabs: TabData[] = [
  {
    id: 'main',
    label: 'Capture',
    icon: <RocketLaunchIcon fontSize="small" />
  },
  {
    id: 'live-share',
    label: 'Share',
    icon: <ShareIcon fontSize="small" />
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon fontSize="small" />
  }
];

export const TabNavigation: React.FC = () => {
  const activeTab = useActiveTab();
  const setActiveTab = usePopupStore(state => state.setActiveTab);

  const handleTabChange = (event: React.SyntheticEvent, newValue: TabId) => {
    setActiveTab(newValue);
  };

  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={activeIndex}
        onChange={(e, index) => handleTabChange(e, tabs[index]?.id)}
        variant="fullWidth"
        textColor="primary"
        indicatorColor="primary"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            iconPosition="start"
            sx={{
              minHeight: 48,
              textTransform: 'none',
              fontSize: '0.875rem',
            }}
          />
        ))}
      </Tabs>
    </Paper>
  );
};