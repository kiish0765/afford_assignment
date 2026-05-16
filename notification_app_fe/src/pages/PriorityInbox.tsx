import React, { useEffect, useState, useCallback } from "react";
import {
  Container, Typography, Box, CircularProgress, Alert,
  Select, MenuItem, FormControl, InputLabel, TextField, Divider,
  Skeleton, Chip, IconButton, Tooltip,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { fetchNotifications } from "../utils/api";
import type { Notification } from "../utils/api";
import { Log } from "../utils/logger";
import NotificationCard from "../components/NotificationCard";

type SortedNotification = Notification & { weight: number };

const getWeight = (type: string) => {
  if (type === "Placement") return 3;
  if (type === "Result") return 2;
  return 1; // Event
};

export default function PriorityInboxPage() {
  const [notifications, setNotifications] = useState<SortedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topN, setTopN] = useState(10);
  const [filterType, setFilterType] = useState("");
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("viewedIds") || "[]"));
    } catch {
      return new Set();
    }
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Log("frontend", "info", "controller", `Loading Priority Inbox: top ${topN}, type=${filterType || "all"}`);

      // Fetch from API (limit=10 is the safe max the server accepts)
      const data = await fetchNotifications({
        limit: 10,
        page: 1,
        notification_type: filterType || undefined,
      });

      // Sort by weight DESC, then timestamp DESC (most recent first)
      const sorted: SortedNotification[] = data
        .map((n) => ({ ...n, weight: getWeight(n.Type) }))
        .sort((a, b) => {
          if (b.weight !== a.weight) return b.weight - a.weight;
          return new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime();
        })
        .slice(0, topN);

      setNotifications(sorted);
      await Log("frontend", "info", "domain", `Priority inbox sorted: ${sorted.length} items`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError("Failed to load priority notifications. Please try again.");
      await Log("frontend", "error", "controller", `Priority fetch failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [topN, filterType]);

  useEffect(() => {
    load();
  }, [load]);

  const markViewed = (id: string) => {
    setViewedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("viewedIds", JSON.stringify(Array.from(next)));
      Log("frontend", "info", "domain", `Priority notification ${id} acknowledged`);
      return next;
    });
  };

  const priorityBreakdown = {
    Placement: notifications.filter((n) => n.Type === "Placement").length,
    Result: notifications.filter((n) => n.Type === "Result").length,
    Event: notifications.filter((n) => n.Type === "Event").length,
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <EmojiEventsRoundedIcon sx={{ color: "#f59e0b", fontSize: 28 }} />
            <Typography variant="h5" fontWeight={800} color="text.primary">
              Priority Inbox
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.3}>
            Top notifications ranked by importance and recency
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={load} color="primary" size="small" disabled={loading}>
            <RefreshRoundedIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Controls */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filterType}
            label="Filter by Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="Placement">📋 Placement</MenuItem>
            <MenuItem value="Result">📊 Result</MenuItem>
            <MenuItem value="Event">🎉 Event</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Show Top N"
          type="number"
          size="small"
          value={topN}
          onChange={(e) => setTopN(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
          inputProps={{ min: 1, max: 50 }}
          sx={{ width: 120 }}
        />
      </Box>

      {/* Summary chips */}
      {!loading && notifications.length > 0 && (
        <Box display="flex" gap={1} mb={3} flexWrap="wrap">
          <Chip
            label={`${priorityBreakdown.Placement} Placements`}
            size="small"
            color="success"
            variant="outlined"
          />
          <Chip
            label={`${priorityBreakdown.Result} Results`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${priorityBreakdown.Event} Events`}
            size="small"
            color="secondary"
            variant="outlined"
          />
        </Box>
      )}

      <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,0.06)" }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={88} sx={{ bgcolor: "rgba(255,255,255,0.04)" }} />
          ))}
        </Box>
      ) : notifications.length === 0 ? (
        <Box textAlign="center" py={8}>
          <EmojiEventsRoundedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" color="text.secondary">No priority notifications</Typography>
          <Typography variant="body2" color="text.disabled" mt={1}>
            Try adjusting the filter or fetch size.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {notifications.map((n, idx) => (
            <Box key={n.ID} sx={{ position: "relative" }}>
              {/* Rank badge */}
              <Box
                sx={{
                  position: "absolute",
                  left: -12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  bgcolor: idx < 3 ? "#f59e0b" : "rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  color: idx < 3 ? "#000" : "#9ca3af",
                  zIndex: 1,
                  boxShadow: idx < 3 ? "0 0 8px rgba(245,158,11,0.5)" : "none",
                }}
              >
                {idx + 1}
              </Box>
              <NotificationCard
                notification={n}
                isViewed={viewedIds.has(n.ID)}
                onMarkRead={() => markViewed(n.ID)}
                priority
              />
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
}
