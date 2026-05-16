import React, { useEffect, useState, useCallback } from "react";
import {
  Container, Typography, Box, CircularProgress, Pagination,
  Select, MenuItem, FormControl, InputLabel, Alert, Badge, Tooltip,
  Skeleton, Divider, IconButton,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import { fetchNotifications } from "../utils/api";
import type { Notification } from "../utils/api";
import { Log } from "../utils/logger";
import NotificationCard from "../components/NotificationCard";

const PAGE_SIZE = 10;

export default function AllNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("viewedIds") || "[]"));
    } catch {
      return new Set();
    }
  });

  const unreadCount = notifications.filter((n) => !viewedIds.has(n.ID)).length;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Log("frontend", "info", "controller", `Fetching page ${page}, type=${filterType || "all"}`);
      const data = await fetchNotifications({
        limit: PAGE_SIZE,
        page,
        notification_type: filterType || undefined,
      });
      setNotifications(data);
      await Log("frontend", "info", "controller", `Fetched ${data.length} notifications`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError("Failed to load notifications. Please try again.");
      await Log("frontend", "error", "controller", `Fetch failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [page, filterType]);

  useEffect(() => {
    load();
  }, [load]);

  const markViewed = (id: string) => {
    setViewedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("viewedIds", JSON.stringify(Array.from(next)));
      Log("frontend", "info", "domain", `Notification ${id} marked as read`);
      return next;
    });
  };

  const markAllRead = () => {
    setViewedIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.ID));
      localStorage.setItem("viewedIds", JSON.stringify(Array.from(next)));
      Log("frontend", "info", "domain", "All notifications marked as read");
      return next;
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h5" fontWeight={800} color="text.primary">
              All Notifications
            </Typography>
            {unreadCount > 0 && (
              <Badge
                badgeContent={unreadCount}
                color="primary"
                sx={{ "& .MuiBadge-badge": { fontSize: "0.7rem", fontWeight: 700 } }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.3}>
            Stay up to date with campus updates
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Mark all as read">
            <IconButton onClick={markAllRead} color="primary" size="small">
              <DoneAllRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={load} color="primary" size="small" disabled={loading}>
              <RefreshRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Filter */}
      <Box mb={3}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filterType}
            label="Filter by Type"
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="Placement">Placement</MenuItem>
            <MenuItem value="Result">Result</MenuItem>
            <MenuItem value="Event">Event</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,0.06)" }} />

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={88} sx={{ bgcolor: "rgba(255,255,255,0.04)" }} />
          ))}
        </Box>
      ) : notifications.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">No notifications found</Typography>
          <Typography variant="body2" color="text.disabled" mt={1}>
            Try adjusting the filter or check back later.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {notifications.map((n) => (
            <NotificationCard
              key={n.ID}
              notification={n}
              isViewed={viewedIds.has(n.ID)}
              onMarkRead={() => markViewed(n.ID)}
            />
          ))}
        </Box>
      )}

      {/* Pagination */}
      {!loading && notifications.length > 0 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={10}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            shape="rounded"
            size="small"
          />
        </Box>
      )}
    </Container>
  );
}
