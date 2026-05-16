import React, { useEffect, useState } from 'react';
import { 
  Container, Typography, List, ListItem, ListItemText, ListItemAvatar, 
  Avatar, Chip, Box, CircularProgress, Pagination, Button
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import SchoolIcon from '@mui/icons-material/School';
import { fetchNotifications, Notification } from '../utils/api';
import { Log } from 'afford-logging-middleware';

export default function AllNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('viewedNotifications');
    if (saved) {
      setViewedIds(new Set(JSON.parse(saved)));
    }
  }, []);

  useEffect(() => {
    loadData();
    Log("frontend", "info", "App", `Loaded All Notifications page ${page}`);
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications(10, page);
      setNotifications(data);
    } catch (error) {
      Log("frontend", "error", "App", "Failed to fetch all notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = (id: string) => {
    const newViewed = new Set(viewedIds);
    newViewed.add(id);
    setViewedIds(newViewed);
    localStorage.setItem('viewedNotifications', JSON.stringify(Array.from(newViewed)));
    Log("frontend", "info", "App", `Marked notification ${id} as viewed`);
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
      <Typography variant="h4" gutterBottom fontWeight="bold" color="text.primary">
        All Notifications
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            {notifications.map((notif) => {
              const isViewed = viewedIds.has(notif.ID);
              return (
                <ListItem 
                  key={notif.ID} 
                  alignItems="flex-start"
                  sx={{
                    bgcolor: isViewed ? 'transparent' : 'action.hover',
                    borderLeft: isViewed ? '4px solid transparent' : '4px solid #1976d2',
                    transition: '0.3s',
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
                        {!isViewed && <Chip label="New" size="small" color="error" />}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {new Date(notif.Timestamp).toLocaleString()}
                      </Typography>
                    }
                  />
                  {!isViewed && (
                    <Button size="small" onClick={() => markAsViewed(notif.ID)}>
                      Mark Read
                    </Button>
                  )}
                </ListItem>
              );
            })}
          </List>
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination 
              count={5} // Assuming 5 pages for mock
              page={page} 
              onChange={(_, p) => setPage(p)} 
              color="primary" 
            />
          </Box>
        </>
      )}
    </Container>
  );
}
