import * as React from "react"
import { cn } from "../../lib/utils"

const TooltipContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {}
})

const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <TooltipContext.Provider value={{ open: false, setOpen: () => {} }}>
    {children}
  </TooltipContext.Provider>
)

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, asChild = false, children, onMouseEnter, onMouseLeave, ...props }, ref) => {
  const { setOpen } = React.useContext(TooltipContext)

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(true)
    onMouseEnter?.(e)
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(false)
    onMouseLeave?.(e)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      ref,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      ...props
    })
  }

  return (
    <button
      ref={ref}
      className={cn(className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { sideOffset?: number }
>(({ className, sideOffset = 4, children, ...props }, ref) => {
  const { open } = React.useContext(TooltipContext)

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs text-slate-50 absolute top-full mt-1 left-0 max-w-xs",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
