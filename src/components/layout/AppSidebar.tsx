import { Home, FileText, FileCode, Lightbulb, BookOpen, Archive, LogOut } from "lucide-react";
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

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-[hsl(var(--green-accent))] text-white"
      : "hover:bg-[hsl(var(--sidebar-dark-hover))]";

  return (
    <Sidebar 
      className={`${state === "collapsed" ? "w-14" : "w-60"} bg-[hsl(var(--sidebar-dark))] text-white border-r border-[hsl(var(--sidebar-dark-hover))]`} 
      collapsible="icon"
    >
      <SidebarContent>
        {/* Header with Green Logo */}
        <div className="p-4 flex items-center justify-between border-b border-[hsl(var(--sidebar-dark-hover))]">
          <div className="flex items-center gap-2">
            {state !== "collapsed" && (
              <>
                <div className="bg-[hsl(var(--green-accent))] text-white font-bold px-3 py-2 rounded-lg text-xl">
                  📖
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">Preachery</span>
                  <span className="text-xs text-gray-400">Paperless & Easy</span>
                </div>
              </>
            )}
            {state === "collapsed" && (
              <div className="bg-[hsl(var(--green-accent))] text-white font-bold px-2 py-1 rounded text-xl">
                📖
              </div>
            )}
          </div>
          <SidebarTrigger className="text-white hover:bg-[hsl(var(--sidebar-dark-hover))]" />
        </div>
        
        {/* Search Bar */}
        {state !== "collapsed" && (
          <div className="p-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search"
                className="w-full bg-[hsl(var(--sidebar-dark-hover))] text-white placeholder-gray-400 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--green-accent))]"
              />
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          {state !== "collapsed" && <SidebarGroupLabel className="text-gray-400 text-xs uppercase">Main</SidebarGroupLabel>}
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
          {state !== "collapsed" && <SidebarGroupLabel className="text-gray-400 text-xs uppercase">Resources</SidebarGroupLabel>}
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

        {/* Sign Out */}
        <div className="mt-auto p-4 border-t border-[hsl(var(--sidebar-dark-hover))]">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-[hsl(var(--sidebar-dark-hover))] hover:text-white"
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
