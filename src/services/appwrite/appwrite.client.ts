import { Account, Client, TablesDB } from "appwrite";
import { env } from "../../core/config/env";

export const appwriteClient = new Client()
	.setEndpoint(env.appwrite.endpoint)
	.setProject(env.appwrite.projectId);

export const account = new Account(appwriteClient);
export const tablesDB = new TablesDB(appwriteClient);
