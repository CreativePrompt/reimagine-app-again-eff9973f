import { Home, FileText, FileCode, Lightbulb, BookOpen, Archive, LogOut, Moon, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTheme } from "next-themes";
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
  const { theme, setTheme } = useTheme();

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50";

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b">
          {state !== "collapsed" && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">📖</span>
              <span className="text-lg font-bold">Preachery</span>
            </div>
          )}
          {state === "collapsed" && <span className="text-2xl">📖</span>}
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
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {state !== "collapsed" && (
              <span className="ml-2">{theme === "dark" ? "Light" : "Dark"} Mode</span>
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
