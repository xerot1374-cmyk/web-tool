// app/demoUsers.ts

export type DemoUser = {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  username: string;
  password: string;
};

export const demoUsers: DemoUser[] = [
  {
    id: "pezhman",
    name: "Pezhman",
    role: "Application Engineer",
    avatar: "",
    username: "pezhman@protos3d.de",
    password: "test123",
  },
  {
    id: "Dipl.-Ing. (FH) Hermann Eiblmeier",
    name: "Dipl.-Ing. (FH) Hermann Eiblmeier",
    role: "Geschäftsführer der PROTOS-3D Metrology GmbH",
    avatar: "",
    username: "hermann@protos3d.de",
    password: "test123",
  },
];
