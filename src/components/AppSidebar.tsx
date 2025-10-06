import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  GraduationCap,
  CreditCard,
  Award,
  FileCheck,
  LogOut,
  UserCog,
  Settings as SettingsIcon,
  Link,
  Trophy,
  Target,
  BarChart3,
  Upload,
  Activity,
  Globe,
  Calendar,
  Clock,
  MessageCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { VersionDisplay } from "@/components/VersionDisplay";
import { useState } from "react";

const menuItems = [
  {
    title: "Principal",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Ranking de Vendas", url: "/sales-ranking", icon: Trophy },
    ],
  },
  {
    title: "Gestão",
    items: [
      { title: "Alunos", url: "/students", icon: Users },
      { title: "Vendas", url: "/sales", icon: ShoppingCart },
      { title: "Processo de Certificação", url: "/certification-process", icon: FileCheck },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { title: "Certificadoras", url: "/certifications", icon: Award },
      { title: "Formas de Pagamento", url: "/payment-methods", icon: CreditCard },
    ],
  },
  // {
  //   title: "Marketing & Leads",
  //   items: [
  //     { title: "Leads", url: "/leads", icon: Target },
  //     { title: "Dashboard", url: "/leads/dashboard", icon: BarChart3 },
  //     { title: "Dashboard Responsável", url: "/leads/var1", icon: Users },
  //     { title: "Dashboard Tráfego", url: "/leads/traffic", icon: Globe },
  //     { title: "Relatório Semanal", url: "/leads/weekday", icon: Calendar },
  //     { title: "Relatório Horário", url: "/leads/hourly", icon: Clock },
  //     { title: "Importar Leads", url: "/leads/import", icon: Upload },
  //   ],
  // },
  {
    title: "Analytics",
    items: [
      { title: "Tracking Dashboard", url: "/tracking", icon: Activity },
    ],
  },
  {
    title: "Sistema",
    items: [
      { title: "Usuários", url: "/users", icon: UserCog },
      { title: "Integrações", url: "/integrations", icon: Link },
      { title: "Configurações", url: "/settings", icon: SettingsIcon },
      {
        title: "Config Global",
        icon: Globe,
        submenu: [
          { title: "Consultores Redirecionamento", url: "/consultores-redirect", icon: MessageCircle },
        ],
      },
    ],
  },
];

const AppSidebar = () => {
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const isActive = (path: string) => currentPath === path;

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <h2 className="font-bold text-lg">Educa Brasil</h2>
                <p className="text-xs text-muted-foreground">
                  Sistema de Gestão <VersionDisplay className="inline" />
                </p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex justify-center">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>

        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            {!isCollapsed && <SidebarGroupLabel>{group.title}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.submenu ? (
                      <Collapsible
                        open={openSubmenus[item.title]}
                        onOpenChange={() => toggleSubmenu(item.title)}
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton>
                            <item.icon className="h-4 w-4" />
                            {!isCollapsed && <span>{item.title}</span>}
                            {!isCollapsed && (
                              openSubmenus[item.title] ? 
                                <ChevronDown className="h-4 w-4 ml-auto" /> : 
                                <ChevronRight className="h-4 w-4 ml-auto" />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.submenu.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                  <NavLink to={subItem.url} end>
                                    <subItem.icon className="h-4 w-4" />
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url} end>
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
                {group.title === "Marketing & Leads" && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/leads/traffic")}>
                      <NavLink to="/leads/traffic" end>
                        <Globe className="h-4 w-4" />
                        {!isCollapsed && <span>Dashboard Tráfego</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        {!isCollapsed && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 h-auto py-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="top">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : isCollapsed && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-full h-12">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="right">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;