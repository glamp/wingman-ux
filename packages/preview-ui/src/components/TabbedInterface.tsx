import React, { useState } from 'react';
import { Box, Tabs, Tab, Badge } from '@mui/material';
import type { WingmanAnnotation } from '@wingman/shared';
import MetadataTab from './tabs/MetadataTab';
import ReactTab from './tabs/ReactTab';
import ConsoleTab from './tabs/ConsoleTab';
import NetworkTab from './tabs/NetworkTab';
import ErrorsTab from './tabs/ErrorsTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`annotation-tabpanel-${index}`}
      aria-labelledby={`annotation-tab-${index}`}
      style={{ flexGrow: 1, display: value === index ? 'flex' : 'none', flexDirection: 'column' }}
    >
      {value === index && children}
    </div>
  );
}

interface TabbedInterfaceProps {
  annotation: WingmanAnnotation;
}

function TabbedInterface({ annotation }: TabbedInterfaceProps) {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const consoleCount = annotation.console?.length || 0;
  const networkCount = annotation.network?.length || 0;
  const errorsCount = annotation.errors?.length || 0;
  const hasReactData = !!annotation.react;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        <Tab label="Metadata" />
        <Tab 
          label={
            hasReactData ? (
              <Badge badgeContent="•" color="success">
                React
              </Badge>
            ) : "React"
          }
        />
        <Tab 
          label={
            <Badge badgeContent={consoleCount} color="primary" max={99}>
              Console
            </Badge>
          }
        />
        <Tab 
          label={
            <Badge badgeContent={networkCount} color="primary" max={99}>
              Network
            </Badge>
          }
        />
        <Tab 
          label={
            <Badge badgeContent={errorsCount} color="error" max={99}>
              Errors
            </Badge>
          }
        />
      </Tabs>

      <TabPanel value={value} index={0}>
        <MetadataTab annotation={annotation} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ReactTab reactData={annotation.react} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <ConsoleTab logs={annotation.console || []} />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <NetworkTab requests={annotation.network || []} />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <ErrorsTab errors={annotation.errors || []} />
      </TabPanel>
    </Box>
  );
}

export default TabbedInterface;