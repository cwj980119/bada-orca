import React, { useState } from 'react'
import { CircleHelp, Keyboard, RotateCw, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/index'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useMountedRef } from '@/hooks/useMountedRef'
import { useShortcutKeyDetails } from '@/lib/keyboard/useShortcutLabel'
import { ShortcutKeyCombo } from '@/components/ui/ShortcutKeyCombo'
import { useTranslate } from '@/i18n/use-translate'

export function SidebarSettingsHelpMenu(): React.JSX.Element {
  const t = useTranslate()
  const openSettingsPage = useAppStore((s) => s.openSettingsPage)
  const openSettingsTarget = useAppStore((s) => s.openSettingsTarget)
  const settingsShortcut = useShortcutKeyDetails('app.settings')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isRestartingOrca, setIsRestartingOrca] = useState(false)
  const mountedRef = useMountedRef()
  const handleRestartOrca = (): void => {
    if (isRestartingOrca) {
      return
    }
    setIsRestartingOrca(true)
    toast.info(t('auto.components.sidebar.SidebarSettingsHelpMenu.5161eef55d', 'Restarting Orca…'))
    void window.api.app.restart().catch((error) => {
      if (mountedRef.current) {
        setIsRestartingOrca(false)
        toast.error(
          t('auto.components.sidebar.SidebarSettingsHelpMenu.4e8f5710d3', "Couldn't restart Orca."),
          {
            description: error instanceof Error ? error.message : undefined
          }
        )
      }
    })
  }

  const openShortcutsSettings = (): void => {
    openSettingsTarget({ pane: 'shortcuts', repoId: null })
    openSettingsPage()
  }

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            type="button"
            aria-label={t('auto.components.sidebar.SidebarSettingsHelpMenu.a428c25998', 'Settings')}
            className="text-muted-foreground"
            onClick={openSettingsPage}
          >
            <Settings className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4} className="flex items-center gap-1.5">
          {t('auto.components.sidebar.SidebarSettingsHelpMenu.a428c25998', 'Settings')}
          {settingsShortcut.keys.length > 0 ? (
            <ShortcutKeyCombo
              keys={settingsShortcut.keys}
              doubleTap={settingsShortcut.doubleTap}
              className="gap-0.5"
              keyCapClassName="min-w-0 border-background/20 bg-background/10 px-1 py-0 text-[10px] text-background shadow-none"
              separatorClassName="text-[10px] text-background/70"
            />
          ) : null}
        </TooltipContent>
      </Tooltip>
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                aria-label={t('auto.components.sidebar.SidebarSettingsHelpMenu.2991a0106c', 'Help')}
                className="text-muted-foreground"
              >
                <CircleHelp className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            {t('auto.components.sidebar.SidebarSettingsHelpMenu.2991a0106c', 'Help')}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-52">
          <DropdownMenuItem onSelect={openShortcutsSettings}>
            <Keyboard className="size-3.5" />
            {t('auto.components.sidebar.SidebarSettingsHelpMenu.e565171a7c', 'Keyboard Shortcuts')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleRestartOrca} disabled={isRestartingOrca}>
            <RotateCw className="size-3.5" />
            {t('auto.components.sidebar.SidebarSettingsHelpMenu.ad3d3ed7f1', 'Restart Orca')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
