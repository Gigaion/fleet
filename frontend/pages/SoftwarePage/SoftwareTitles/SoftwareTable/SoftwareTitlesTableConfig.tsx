import React from "react";
import { CellProps, Column } from "react-table";
import { InjectedRouter } from "react-router";

import {
  IAppStoreApp,
  ISoftware,
  ISoftwarePackage,
  ISoftwareTitle,
  formatSoftwareType,
} from "interfaces/software";
import PATHS from "router/paths";

import { buildQueryStringFromParams } from "utilities/url";
import { IHeaderProps, IStringCellProps } from "interfaces/datatable_config";

import HeaderCell from "components/TableContainer/DataTable/HeaderCell";
import TextCell from "components/TableContainer/DataTable/TextCell";
import ViewAllHostsLink from "components/ViewAllHostsLink";
import SoftwareNameCell from "components/TableContainer/DataTable/SoftwareNameCell";

import VersionCell from "../../components/VersionCell";
import VulnerabilitiesCell from "../../components/VulnerabilitiesCell";

// NOTE: cellProps come from react-table
// more info here https://react-table.tanstack.com/docs/api/useTable#cell-properties

type ISoftwareTitlesTableConfig = Column<ISoftwareTitle>;
type ITableStringCellProps = IStringCellProps<ISoftwareTitle>;
type IVersionsCellProps = CellProps<ISoftwareTitle, ISoftwareTitle["versions"]>;
type IVulnerabilitiesCellProps = IVersionsCellProps;
type IHostCountCellProps = CellProps<
  ISoftwareTitle,
  ISoftwareTitle["hosts_count"]
>;
type IViewAllHostsLinkProps = CellProps<ISoftwareTitle>;

type ITableHeaderProps = IHeaderProps<ISoftwareTitle>;

export const getVulnerabilities = <
  T extends { vulnerabilities: string[] | null }
>(
  versions: T[]
) => {
  if (!versions) {
    return [];
  }
  const vulnerabilities = versions.reduce((acc: string[], currentVersion) => {
    if (
      currentVersion.vulnerabilities &&
      currentVersion.vulnerabilities.length !== 0
    ) {
      acc.push(...currentVersion.vulnerabilities);
    }
    return acc;
  }, []);
  return vulnerabilities;
};

/**
 * Gets the data needed to render the software name cell.
 */
const getSoftwareNameCellData = (
  softwareTitle: ISoftwareTitle,
  teamId?: number
) => {
  const teamQueryParam = buildQueryStringFromParams({ team_id: teamId });
  const softwareTitleDetailsPath = `${PATHS.SOFTWARE_TITLE_DETAILS(
    softwareTitle.id.toString()
  )}?${teamQueryParam}`;

  const { software_package, app_store_app } = softwareTitle;
  let hasPackage = false;
  let isSelfService = false;
  let iconUrl: string | null = null;
  if (software_package) {
    hasPackage = true;
    isSelfService = software_package.self_service;
  } else if (app_store_app) {
    hasPackage = true;
    isSelfService = false;
    iconUrl = app_store_app.icon_url;
  }

  return {
    name: softwareTitle.name,
    source: softwareTitle.source,
    path: softwareTitleDetailsPath,
    hasPackage: hasPackage && !!teamId,
    isSelfService,
    iconUrl,
  };
};

const generateTableHeaders = (
  router: InjectedRouter,
  teamId?: number
): ISoftwareTitlesTableConfig[] => {
  const softwareTableHeaders: ISoftwareTitlesTableConfig[] = [
    {
      Header: (cellProps: ITableHeaderProps) => (
        <HeaderCell value="Name" isSortedDesc={cellProps.column.isSortedDesc} />
      ),
      disableSortBy: false,
      accessor: "name",
      Cell: (cellProps: ITableStringCellProps) => {
        const nameCellData = getSoftwareNameCellData(
          cellProps.row.original,
          teamId
        );

        return (
          <SoftwareNameCell
            name={nameCellData.name}
            source={nameCellData.source}
            path={nameCellData.path}
            router={router}
            hasPackage={nameCellData.hasPackage}
            isSelfService={nameCellData.isSelfService}
            iconUrl={nameCellData.iconUrl ?? undefined}
          />
        );
      },
      sortType: "caseInsensitive",
    },
    {
      Header: "Type",
      disableSortBy: true,
      accessor: "source",
      Cell: (cellProps: ITableStringCellProps) => (
        <TextCell value={formatSoftwareType(cellProps.row.original)} />
      ),
    },
    {
      Header: "Version",
      disableSortBy: true,
      accessor: "versions",
      Cell: (cellProps: IVersionsCellProps) => (
        <VersionCell versions={cellProps.cell.value} />
      ),
    },
    // the "vulnerabilities" accessor is used but the data is actually coming
    // from the version attribute. We do this as we already have a "versions"
    // attribute used for the "Version" column and we cannot reuse. This is a
    // limitation of react-table.
    // With the versions data, we can sum up the vulnerabilities to get the
    // total number of vulnerabilities for the software title
    {
      Header: "Vulnerabilities",
      disableSortBy: true,
      Cell: (cellProps: IVulnerabilitiesCellProps) => {
        const vulnerabilities = getVulnerabilities(
          cellProps.row.original.versions ?? []
        );
        return <VulnerabilitiesCell vulnerabilities={vulnerabilities} />;
      },
    },
    {
      Header: (cellProps: ITableHeaderProps) => (
        <HeaderCell
          value="Hosts"
          disableSortBy={false}
          isSortedDesc={cellProps.column.isSortedDesc}
        />
      ),
      disableSortBy: false,
      accessor: "hosts_count",
      Cell: (cellProps: IHostCountCellProps) => (
        <TextCell value={cellProps.cell.value} />
      ),
    },
    {
      Header: "",
      id: "view-all-hosts",
      disableSortBy: true,
      Cell: (cellProps: IViewAllHostsLinkProps) => {
        return (
          <ViewAllHostsLink
            queryParams={{
              software_title_id: cellProps.row.original.id,
              team_id: teamId, // TODO: do we need team id here?
            }}
            className="software-link"
            rowHover
          />
        );
      },
    },
  ];

  return softwareTableHeaders;
};

export default generateTableHeaders;
