import React from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
  useMediaQuery,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import MenuIcon from "@mui/icons-material/Menu";
import AllNotificationsPage from "./pages/AllNotifications";
import PriorityInboxPage from "./pages/PriorityInbox";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#7c6ef5" },
    secondary: { main: "#f59e6e" },
    background: { default: "#0d0d14", paper: "#16162a" },
    success: { main: "#4ade80" },
    warning: { main: "#f59e0b" },
    error: { main: "#f87171" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(255,255,255,0.06)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: "0.72rem" },
      },
    },
  },
});

const NAV_LINKS = [
  { label: "All Notifications", to: "/" },
  { label: "Priority Inbox", to: "/priority" },
];

export default function App() {
  const isMobile = useMediaQuery(darkTheme.breakpoints.down("sm"));
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: "rgba(22,22,42,0.85)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(124,110,245,0.18)",
          }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #7c6ef5, #a78bfa)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <NotificationsRoundedIcon sx={{ fontSize: 20, color: "#fff" }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  background: "linear-gradient(135deg, #a78bfa, #f59e6e)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                }}
              >
                CampusConnect
              </Typography>
              <Chip label="BETA" size="small" color="primary" sx={{ ml: 0.5, height: 18, fontSize: "0.6rem" }} />
            </Box>

            {isMobile ? (
              <>
                <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
                  <MenuIcon />
                </IconButton>
                <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                  <Box sx={{ width: 220, pt: 2, bgcolor: "background.paper", height: "100%" }}>
                    <List>
                      {NAV_LINKS.map((link) => (
                        <ListItem key={link.to} disablePadding>
                          <ListItemButton
                            component={NavLink}
                            to={link.to}
                            onClick={() => setDrawerOpen(false)}
                            sx={{
                              "&.active": { color: "primary.main", bgcolor: "rgba(124,110,245,0.1)" },
                            }}
                          >
                            <ListItemText primary={link.label} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Drawer>
              </>
            ) : (
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {NAV_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end
                    style={({ isActive }) => ({
                      textDecoration: "none",
                      padding: "6px 16px",
                      borderRadius: 8,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: isActive ? "#a78bfa" : "#9ca3af",
                      background: isActive ? "rgba(124,110,245,0.12)" : "transparent",
                      transition: "all 0.2s",
                    })}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </Box>
            )}
          </Toolbar>
        </AppBar>

        <Routes>
          <Route path="/" element={<AllNotificationsPage />} />
          <Route path="/priority" element={<PriorityInboxPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
