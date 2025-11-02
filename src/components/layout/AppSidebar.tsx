import { Home, FileText, FileCode, Lightbulb, BookOpen, Archive, LogOut, Moon, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Sermons", url: "/sermons", icon: FileText },
  { title: "Templates", url: "/templates", icon: FileCode },
];

const resourceItems = [
  { title: "Ideas", url: "/ideas", icon: Lightbulb },
  { title: "Resources", url: "/resources", icon: BookOpen },
  { title: "Archive", url: "/archive", icon: Archive },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("sidebar-theme");
    return saved === "dark";
  });

  useEffect(() => {
    localStorage.setItem("sidebar-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground"
      : "hover:bg-accent hover:text-accent-foreground";

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <Sidebar 
      className={`${state === "collapsed" ? "w-14" : "w-60"} ${isDark ? "dark bg-slate-900 text-white" : "bg-background"}`} 
      collapsible="icon"
    >
      <SidebarContent className={isDark ? "dark" : ""}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            {state !== "collapsed" && (
              <>
                <span className="text-2xl">📖</span>
                <span className="text-lg font-bold">Preachery</span>
              </>
            )}
            {state === "collapsed" && <span className="text-2xl">📖</span>}
          </div>
          <SidebarTrigger />
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          {state !== "collapsed" && <SidebarGroupLabel>Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Resources */}
        <SidebarGroup>
          {state !== "collapsed" && <SidebarGroupLabel>Resources</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {resourceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Theme Toggle & Sign Out */}
        <div className="mt-auto space-y-2 p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={toggleTheme}
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {state !== "collapsed" && (
              <span className="ml-2">{isDark ? "Dark" : "Light"} Mode</span>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            {state !== "collapsed" && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
