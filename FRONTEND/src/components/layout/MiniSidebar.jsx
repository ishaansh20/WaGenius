import useUiStore, { SIDEBAR_WIDTH } from "../../store/uiStore";
import SidebarPanel from "./SidebarPanel";

// Desktop (lg+) fixed sidebar. Expanded/collapsed state is shared via
// uiStore so layouts can offset their content with `useSidebarOffset`.
export function MiniSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 hidden transition-[width] duration-200 lg:block"
      style={{ width: collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded }}
    >
      <SidebarPanel collapsed={collapsed} onToggleCollapse={toggleSidebar} />
    </aside>
  );
}
