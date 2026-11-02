import { ANNOUNCEMENT } from '../../constants/navigation'

export default function AnnouncementBar() {
  return (
    <div
      className="bg-ink px-4 py-2 text-center text-xs font-medium tracking-wide text-white"
      data-manage-edit="/manage/storefront?focus=announcement"
      data-manage-label="Announcement bar"
    >
      {ANNOUNCEMENT}
    </div>
  )
}
