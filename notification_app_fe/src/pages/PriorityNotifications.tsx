import React, { useEffect, useState } from 'react';
import { 
  Container, Typography, List, ListItem, ListItemText, ListItemAvatar, 
  Avatar, Chip, Box, CircularProgress, Button, FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import SchoolIcon from '@mui/icons-material/School';
import { fetchNotifications, Notification } from '../utils/api';
import { Log } from 'afford-logging-middleware';

export default function PriorityNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(10);
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('viewedNotifications');
    if (saved) {
      setViewedIds(new Set(JSON.parse(saved)));
    }
  }, []);

  useEffect(() => {
    loadData();
    Log("frontend", "info", "App", `Loaded Priority Inbox with limit ${limit}`);
  }, [limit, filterType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications(limit, 1, filterType || undefined);
      
      // Sort manually by weight and recency to simulate priority
      const getWeight = (type: string) => {
        if (type === "Placement") return 3;
        if (type === "Result") return 2;
        if (type === "Event") return 1;
        return 0;
      };

      data.sort((a, b) => {
        const weightDiff = getWeight(b.Type) - getWeight(a.Type);
        if (weightDiff !== 0) return weightDiff;
        return new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime();
      });

      setNotifications(data);
    } catch (error) {
      Log("frontend", "error", "App", "Failed to fetch priority notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = (id: string) => {
    const newViewed = new Set(viewedIds);
    newViewed.add(id);
    setViewedIds(newViewed);
    localStorage.setItem('viewedNotifications', JSON.stringify(Array.from(newViewed)));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Placement': return <SchoolIcon />;
      case 'Result': return <AssuredWorkloadIcon />;
      case 'Event': return <EventIcon />;
      default: return <EventIcon />;
    }
  };

  const getColor = (type: string): "primary" | "secondary" | "success" => {
    switch (type) {
      case 'Placement': return 'success';
      case 'Result': return 'primary';
      case 'Event': return 'secondary';
      default: return 'primary';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" color="secondary.main">
        Priority Inbox
      </Typography>

      <Box display="flex" gap={2} mb={3} mt={2}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={filterType}
            label="Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value=""><em>All Types</em></MenuItem>
            <MenuItem value="Placement">Placement</MenuItem>
            <MenuItem value="Result">Result</MenuItem>
            <MenuItem value="Event">Event</MenuItem>
          </Select>
        </FormControl>

        <TextField 
          label="Top N Limit" 
          type="number" 
          size="small" 
          value={limit}
          onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value) || 1))}
          sx={{ width: 100 }}
        />
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress color="secondary" />
        </Box>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
          {notifications.map((notif) => {
            const isViewed = viewedIds.has(notif.ID);
            return (
              <ListItem 
                key={notif.ID} 
                alignItems="flex-start"
                sx={{
                  bgcolor: isViewed ? 'transparent' : '#fff3e0',
                  borderLeft: isViewed ? '4px solid transparent' : '4px solid #ed6c02',
                  mb: 1
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: `${getColor(notif.Type)}.main` }}>
                    {getIcon(notif.Type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1" fontWeight={isViewed ? 'normal' : 'bold'}>
                        {notif.Message}
                      </Typography>
                      <Chip label={notif.Type} size="small" color={getColor(notif.Type)} />
                      {!isViewed && <Chip label="High Priority" size="small" color="warning" />}
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      {new Date(notif.Timestamp).toLocaleString()}
                    </Typography>
                  }
                />
                {!isViewed && (
                  <Button size="small" color="warning" onClick={() => markAsViewed(notif.ID)}>
                    Acknowledge
                  </Button>
                )}
              </ListItem>
            );
          })}
          {notifications.length === 0 && (
            <Typography variant="body1" textAlign="center" py={3} color="text.secondary">
              No priority notifications found.
            </Typography>
          )}
        </List>
      )}
    </Container>
  );
}
