import React from "react";
import {
  Paper, Box, Typography, Chip, Button, Tooltip,
} from "@mui/material";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import type { Notification } from "../utils/api";

interface Props {
  notification: Notification;
  isViewed: boolean;
  onMarkRead: () => void;
  priority?: boolean;
}

const TYPE_CONFIG = {
  Placement: {
    icon: <SchoolRoundedIcon sx={{ fontSize: 18 }} />,
    color: "#4ade80",
    bg: "rgba(74,222,128,0.08)",
    border: "rgba(74,222,128,0.2)",
    chip: "success" as const,
    label: "Placement",
    glow: "rgba(74,222,128,0.15)",
  },
  Result: {
    icon: <AssessmentRoundedIcon sx={{ fontSize: 18 }} />,
    color: "#7c6ef5",
    bg: "rgba(124,110,245,0.08)",
    border: "rgba(124,110,245,0.2)",
    chip: "primary" as const,
    label: "Result",
    glow: "rgba(124,110,245,0.15)",
  },
  Event: {
    icon: <CelebrationRoundedIcon sx={{ fontSize: 18 }} />,
    color: "#f59e6e",
    bg: "rgba(245,158,110,0.08)",
    border: "rgba(245,158,110,0.2)",
    chip: "warning" as const,
    label: "Event",
    glow: "rgba(245,158,110,0.15)",
  },
};

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const ts = new Date(timestamp).getTime();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationCard({ notification, isViewed, onMarkRead, priority }: Props) {
  const cfg = TYPE_CONFIG[notification.Type] ?? TYPE_CONFIG.Event;

  return (
    <Paper
      elevation={0}
      sx={{
        px: 2.5,
        py: 2,
        display: "flex",
        alignItems: "center",
        gap: 2,
        borderRadius: "14px",
        border: isViewed
          ? "1px solid rgba(255,255,255,0.06)"
          : `1px solid ${cfg.border}`,
        background: isViewed
          ? "rgba(255,255,255,0.02)"
          : cfg.bg,
        transition: "all 0.25s ease",
        position: "relative",
        overflow: "hidden",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: isViewed
            ? "0 4px 20px rgba(0,0,0,0.3)"
            : `0 4px 24px ${cfg.glow}`,
        },
        ...(priority && !isViewed && {
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: cfg.color,
            borderRadius: "14px 0 0 14px",
          },
        }),
      }}
    >
      {/* Type icon */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "12px",
          bgcolor: cfg.bg,
          border: `1px solid ${cfg.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: cfg.color,
          flexShrink: 0,
        }}
      >
        {cfg.icon}
      </Box>

      {/* Content */}
      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={1} mb={0.4} flexWrap="wrap">
          <Chip
            label={cfg.label}
            size="small"
            color={cfg.chip}
            sx={{ height: 20, fontSize: "0.68rem" }}
          />
          {!isViewed && (
            <FiberManualRecordIcon sx={{ fontSize: 8, color: cfg.color }} />
          )}
        </Box>
        <Typography
          variant="body2"
          fontWeight={isViewed ? 400 : 600}
          color={isViewed ? "text.secondary" : "text.primary"}
          noWrap
          sx={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {notification.Message}
        </Typography>
        <Typography variant="caption" color="text.disabled" mt={0.2} display="block">
          {timeAgo(notification.Timestamp)} &nbsp;·&nbsp;{" "}
          {new Date(notification.Timestamp).toLocaleString()}
        </Typography>
      </Box>

      {/* Action */}
      {!isViewed && (
        <Tooltip title="Mark as read">
          <Button
            onClick={onMarkRead}
            size="small"
            variant="outlined"
            startIcon={<CheckRoundedIcon sx={{ fontSize: "14px !important" }} />}
            sx={{
              borderColor: cfg.border,
              color: cfg.color,
              fontSize: "0.72rem",
              px: 1.2,
              py: 0.5,
              minWidth: "unset",
              flexShrink: 0,
              "&:hover": { borderColor: cfg.color, bgcolor: cfg.bg },
            }}
          >
            Read
          </Button>
        </Tooltip>
      )}
    </Paper>
  );
}
