import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowDown,
  faArrowUp,
  faBars,
  faBox,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faClipboardList,
  faEnvelope,
  faEye,
  faFilter,
  faFolder,
  faGear,
  faGraduationCap,
  faGripVertical,
  faHouse,
  faLayerGroup,
  faMap,
  faPen,
  faPlus,
  faRightFromBracket,
  faSearch,
  faStar,
  faWandMagicSparkles,
  faStore,
  faTag,
  faTicket,
  faTrash,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'

const ICONS = {
  home: faHouse,
  orders: faClipboardList,
  products: faBox,
  picks: faLayerGroup,
  categories: faFolder,
  storefront: faStore,
  reviews: faStar,
  coupons: faTicket,
  customers: faUsers,
  looks: faWandMagicSparkles,
  courses: faGraduationCap,
  mail: faEnvelope,
  map: faMap,
  settings: faGear,
  search: faSearch,
  plus: faPlus,
  pen: faPen,
  trash: faTrash,
  check: faCheck,
  xmark: faXmark,
  eye: faEye,
  store: faStore,
  logout: faRightFromBracket,
  bars: faBars,
  tag: faTag,
  grip: faGripVertical,
  up: faArrowUp,
  down: faArrowDown,
  chevronLeft: faChevronLeft,
  chevronRight: faChevronRight,
}

/**
 * Font Awesome icon for the owner portal. Pass a known key from ICONS.
 */
export default function FaIcon({ icon, className = 'h-4 w-4', fixedWidth = true }) {
  const definition = ICONS[icon] || faTag
  return (
    <FontAwesomeIcon
      icon={definition}
      className={className}
      fixedWidth={fixedWidth}
      aria-hidden="true"
    />
  )
}
