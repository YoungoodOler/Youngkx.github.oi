import friendLinksSnapshot from '../content/friend-links.json';
import { githubProfileUrl } from './author';
import {
  validateUsefulLinksPayload,
  type UsefulLinkGroup,
  type UsefulLinksPayload,
} from './useful-links-schema';

export * from './useful-links-schema';

export const friendLinksPath = '/links/';
export const friendLinksTitle = 'Links 友链';

export const friendLinkTiers = [
  { id: 'youngkx', title: 'Youngkx' },
  { id: 'friends', title: 'Friends' },
  { id: 'friend-links', title: '友链' },
] as const;

export function organizeFriendLinks(groups: UsefulLinkGroup[]): UsefulLinkGroup[] {
  const organized = friendLinkTiers.map<UsefulLinkGroup>((tier) => ({
    ...tier,
    description: '',
    links: [],
  }));
  const [ownLinks, , generalLinks] = organized;
  for (const group of groups) {
    const currentTier = organized.find(
      (tier) => group.id === tier.id && group.title === tier.title,
    );
    if (currentTier) {
      currentTier.links.push(...group.links);
      continue;
    }
    for (const link of group.links) {
      const tier = link.href === githubProfileUrl ? ownLinks : generalLinks;
      tier.links.push(link);
    }
  }
  return organized;
}

const snapshot = validateUsefulLinksPayload(friendLinksSnapshot);
if (!snapshot.ok) throw new Error(`Invalid friend links snapshot: ${snapshot.error}`);
const snapshotData = snapshot.data;

export function createDefaultFriendLinksPayload(): UsefulLinksPayload {
  return structuredClone(snapshotData);
}

export const usefulLinkCount = snapshotData.groups.reduce(
  (total, group) => total + group.links.length,
  0,
);
