import { Alert } from 'react-native';

const IPFS_GATEWAY = 'https://ipfs.le-space.de/ipfs/';

interface IPFSMetadata {
  image?: string;
  name?: string;
  description?: string;
}

export const getIPFSUrl = (ipfsHash: string): string => {
  return ipfsHash.replace('ipfs://', IPFS_GATEWAY);
};

export const fetchIPFSJson = async (ipfsUrl: string): Promise<IPFSMetadata | null> => {
  try {
    const response = await fetch(getIPFSUrl(ipfsUrl));
    if (!response.ok) {
      console.warn('IPFS fetch failed:', response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn('IPFS fetch error:', error);
    return null;
  }
};

export const checkIPFSImageAccessibility = async (imageUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(getIPFSUrl(imageUrl));
    return response.ok;
  } catch (error) {
    console.warn('IPFS image accessibility check failed:', error);
    return false;
  }
};

export const getIPFSImageUrl = async (ipfsUrl: string): Promise<string | null> => {
  const metadata = await fetchIPFSJson(ipfsUrl);
  if (!metadata?.image) {
    return null;
  }
  
  const imageUrl = metadata.image;
  const isAccessible = await checkIPFSImageAccessibility(imageUrl);
  
  return isAccessible ? getIPFSUrl(imageUrl) : null;
};
