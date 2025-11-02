import { useState } from "react";
import { Home, FileText, FileCode, Lightbulb, BookOpen, Archive, LogOut, Moon, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
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
  const [isDark, setIsDark] = useState(false);

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? `${isDark ? "bg-accent/20 text-accent" : "bg-accent text-accent-foreground"}`
      : `${isDark ? "hover:bg-accent/10" : "hover:bg-accent/50"}`;

  return (
    <Sidebar 
      className={`${state === "collapsed" ? "w-14" : "w-60"} ${
        isDark 
          ? "bg-[hsl(222_47%_12%)] border-[hsl(222_30%_18%)] text-[hsl(210_40%_98%)]" 
          : "bg-background border-border"
      }`} 
      collapsible="icon"
    >
      <SidebarContent className={isDark ? "bg-[hsl(222_47%_12%)]" : ""}>
        {/* Header */}
        <div className={`p-4 flex items-center justify-between border-b ${
          isDark ? "border-[hsl(222_30%_18%)]" : ""
        }`}>
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
        <div className={`mt-auto space-y-2 p-4 border-t ${
          isDark ? "border-[hsl(222_30%_18%)]" : ""
        }`}>
          <Button
            variant="ghost"
            className={`w-full justify-start ${isDark ? "hover:bg-white/10" : "hover:bg-accent/10"}`}
            onClick={() => setIsDark(!isDark)}
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {state !== "collapsed" && (
              <span className="ml-2">{isDark ? "Light" : "Dark"} Mode</span>
            )}
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${isDark ? "hover:bg-white/10" : "hover:bg-accent/10"}`}
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
