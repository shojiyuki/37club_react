export type MyPost = {
  imageUri: string | null;
  caption: string;
  postedAt: string;
  topicLabel: string;
};

const MOCK_MY_POST: MyPost = {
  imageUri: null,
  caption: "赤いバラを持ってきた",
  postedAt: "06:32",
  topicLabel: "渋谷駅 ハチ公前",
};

export function useMyPost() {
  return {
    myPost: MOCK_MY_POST,
    isLoading: false,
    error: null,
  };
}
